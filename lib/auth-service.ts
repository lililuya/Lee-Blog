import { UserRole, UserStatus } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionForUser,
  destroyCurrentSession,
  destroyOtherSessionsForUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { AuthFlowError } from "@/lib/auth-errors";
import {
  assertLoginAllowed,
  buildLoginSecurityContext,
  notifyUserOfNewLogin,
  recordLoginAttempt,
} from "@/lib/auth-security";
import { issueEmailVerificationForUser } from "@/lib/email-verification";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/password-reset";
import {
  createTwoFactorChallengeToken,
  hashTwoFactorChallengeToken,
  TWO_FACTOR_CHALLENGE_TTL_MS,
  verifyTwoFactorToken,
} from "@/lib/two-factor";
import { isDatabaseConfigured } from "@/lib/utils";
import {
  changePasswordSchema,
  twoFactorTokenSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validators";

function getAccountStateMessage(status: UserStatus, reason: string | null) {
  if (status === UserStatus.SUSPENDED) {
    return reason ? `This account has been suspended: ${reason}` : "This account has been suspended.";
  }

  if (status === UserStatus.DELETED) {
    return "This account has been deleted and can no longer sign in.";
  }

  return null;
}

type LoginSecurityContext = ReturnType<typeof buildLoginSecurityContext>;

type LoginCandidateUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  statusReason: string | null;
  passwordHash: string;
  emailVerificationRequired: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  lastLoginIpHash: string | null;
  lastLoginUserAgentHash: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
};

function toLoginSuccessUser(user: Pick<LoginCandidateUser, "id" | "name" | "email" | "role" | "status">) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function requiresTwoFactor(user: LoginCandidateUser) {
  return user.role === UserRole.ADMIN && user.twoFactorEnabled && Boolean(user.twoFactorSecret);
}

async function finalizeSuccessfulLogin(input: {
  user: LoginCandidateUser;
  securityContext: LoginSecurityContext;
}) {
  const { user, securityContext } = input;
  const isUnusualLogin =
    Boolean(user.lastLoginAt) &&
    ((Boolean(securityContext.ipHash) &&
      Boolean(user.lastLoginIpHash) &&
      securityContext.ipHash !== user.lastLoginIpHash) ||
      (Boolean(securityContext.userAgentHash) &&
        Boolean(user.lastLoginUserAgentHash) &&
        securityContext.userAgentHash !== user.lastLoginUserAgentHash));
  const loginTimestamp = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: loginTimestamp,
      lastLoginIpHash: securityContext.ipHash ?? user.lastLoginIpHash ?? null,
      lastLoginUserAgentHash:
        securityContext.userAgentHash ?? user.lastLoginUserAgentHash ?? null,
    },
  });

  await recordLoginAttempt({
    email: user.email,
    ipHash: securityContext.ipHash,
    userAgent: securityContext.userAgent,
    succeeded: true,
  });

  if (isUnusualLogin) {
    try {
      await notifyUserOfNewLogin({
        name: user.name,
        email: user.email,
        occurredAt: loginTimestamp,
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
      });
    } catch (error) {
      console.error("[auth security:new-login-alert]", error);
    }
  }

  await createSessionForUser(user.id);

  return toLoginSuccessUser(user);
}

async function createLoginTwoFactorChallenge(input: {
  userId: string;
  securityContext: LoginSecurityContext;
}) {
  const challengeToken = createTwoFactorChallengeToken();
  const expiresAt = new Date(Date.now() + TWO_FACTOR_CHALLENGE_TTL_MS);

  await prisma.$transaction([
    prisma.twoFactorChallenge.deleteMany({
      where: {
        userId: input.userId,
      },
    }),
    prisma.twoFactorChallenge.create({
      data: {
        tokenHash: hashTwoFactorChallengeToken(challengeToken),
        expiresAt,
        userId: input.userId,
        ipHash: input.securityContext.ipHash ?? null,
        userAgentHash: input.securityContext.userAgentHash ?? null,
      },
    }),
  ]);

  return {
    challengeToken,
    expiresAt,
  };
}

export async function loginWithCredentials(
  payload: unknown,
  context?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const parsed = loginSchema.parse(payload);
  const email = parsed.email.toLowerCase();
  const securityContext = buildLoginSecurityContext(context ?? {});

  await assertLoginAllowed({
    email,
    ipHash: securityContext.ipHash,
  });

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      statusReason: true,
      passwordHash: true,
      emailVerificationRequired: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      lastLoginIpHash: true,
      lastLoginUserAgentHash: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  if (!user) {
    await recordLoginAttempt({
      email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await verifyPassword(parsed.password, user.passwordHash);

  if (!isPasswordValid) {
    await recordLoginAttempt({
      email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new Error("Invalid email or password.");
  }

  const accountStateMessage = getAccountStateMessage(user.status, user.statusReason);

  if (accountStateMessage) {
    await recordLoginAttempt({
      email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new Error(accountStateMessage);
  }

  if (user.emailVerificationRequired && !user.emailVerifiedAt) {
    await recordLoginAttempt({
      email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new AuthFlowError({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before signing in.",
      details: {
        email: user.email,
      },
    });
  }

  if (requiresTwoFactor(user)) {
    const challenge = await createLoginTwoFactorChallenge({
      userId: user.id,
      securityContext,
    });

    return {
      requiresTwoFactor: true as const,
      challengeToken: challenge.challengeToken,
      challengeExpiresAt: challenge.expiresAt,
      user: toLoginSuccessUser(user),
    };
  }

  return {
    requiresTwoFactor: false as const,
    user: await finalizeSuccessfulLogin({
      user,
      securityContext,
    }),
  };
}

export async function verifyLoginTwoFactorCode(
  payload: unknown,
  context?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const parsed = twoFactorTokenSchema.parse(payload);
  const securityContext = buildLoginSecurityContext(context ?? {});
  const challengeToken = String((payload as { challengeToken?: unknown })?.challengeToken ?? "").trim();

  if (!challengeToken) {
    throw new AuthFlowError({
      code: "TWO_FACTOR_REQUIRED",
      message: "Your sign-in session expired. Please enter your email and password again.",
      status: 400,
    });
  }

  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: {
      tokenHash: hashTwoFactorChallengeToken(challengeToken),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          statusReason: true,
          passwordHash: true,
          emailVerificationRequired: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          lastLoginIpHash: true,
          lastLoginUserAgentHash: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
        },
      },
    },
  });

  if (!challenge) {
    throw new AuthFlowError({
      code: "TWO_FACTOR_REQUIRED",
      message: "Your sign-in session expired. Please enter your email and password again.",
      status: 400,
    });
  }

  const user = challenge.user;

  if (!user) {
    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    throw new AuthFlowError({
      code: "TWO_FACTOR_REQUIRED",
      message: "Your sign-in session expired. Please enter your email and password again.",
      status: 400,
    });
  }

  if (challenge.expiresAt < new Date()) {
    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    await recordLoginAttempt({
      email: user.email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new AuthFlowError({
      code: "TWO_FACTOR_REQUIRED",
      message: "Your sign-in session expired. Please enter your email and password again.",
      status: 400,
    });
  }

  if (
    (challenge.ipHash && securityContext.ipHash && challenge.ipHash !== securityContext.ipHash) ||
    (challenge.userAgentHash &&
      securityContext.userAgentHash &&
      challenge.userAgentHash !== securityContext.userAgentHash)
  ) {
    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    await recordLoginAttempt({
      email: user.email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new AuthFlowError({
      code: "TWO_FACTOR_REQUIRED",
      message: "The verification request did not match the original sign-in session. Please sign in again.",
      status: 400,
    });
  }

  const accountStateMessage = getAccountStateMessage(user.status, user.statusReason);

  if (accountStateMessage) {
    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    await recordLoginAttempt({
      email: user.email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new AuthFlowError({
      code: "ACCOUNT_RESTRICTED",
      message: accountStateMessage,
      status: 403,
    });
  }

  if (user.emailVerificationRequired && !user.emailVerifiedAt) {
    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    await recordLoginAttempt({
      email: user.email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });
    throw new AuthFlowError({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before signing in.",
      status: 403,
      details: {
        email: user.email,
      },
    });
  }

  if (!requiresTwoFactor(user) || !user.twoFactorSecret) {
    await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    throw new AuthFlowError({
      code: "TWO_FACTOR_NOT_CONFIGURED",
      message: "Two-factor authentication is no longer configured for this account. Please sign in again.",
      status: 400,
    });
  }

  const nextAttempts = challenge.attempts + 1;
  const isValid = verifyTwoFactorToken(user.twoFactorSecret, parsed.code);

  if (!isValid) {
    if (nextAttempts >= 5) {
      await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);
    } else {
      await prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: nextAttempts,
        },
      });
    }

    await recordLoginAttempt({
      email: user.email,
      ipHash: securityContext.ipHash,
      userAgent: securityContext.userAgent,
      succeeded: false,
    });

    throw new AuthFlowError({
      code: nextAttempts >= 5 ? "TWO_FACTOR_REQUIRED" : "TWO_FACTOR_INVALID",
      message:
        nextAttempts >= 5
          ? "Too many invalid verification codes. Please sign in again."
          : "The verification code was not correct.",
      status: 400,
    });
  }

  await prisma.twoFactorChallenge.delete({ where: { id: challenge.id } }).catch(() => null);

  return {
    requiresTwoFactor: false as const,
    user: await finalizeSuccessfulLogin({
      user,
      securityContext,
    }),
  };
}

export async function clearLoginTwoFactorChallenge(challengeToken: string | null | undefined) {
  if (!isDatabaseConfigured() || !challengeToken) {
    return;
  }

  await prisma.twoFactorChallenge
    .deleteMany({
      where: {
        tokenHash: hashTwoFactorChallengeToken(challengeToken),
      },
    })
    .catch(() => null);
}

export async function registerWithCredentials(payload: unknown) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const parsed = registerSchema.parse(payload);
  const email = parsed.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.emailVerificationRequired && !existing.emailVerifiedAt) {
      const verification = await issueEmailVerificationForUser({
        id: existing.id,
        name: existing.name,
        email: existing.email,
      });

      return {
        requiresEmailVerification: true,
        email: existing.email,
        resent: true,
        emailSent: verification.emailSent,
        verificationUrl: verification.verificationUrl,
      };
    }

    throw new AuthFlowError({
      code: "EMAIL_ALREADY_REGISTERED",
      message: "This email is already registered.",
    });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email,
      passwordHash: await hashPassword(parsed.password),
      role: UserRole.READER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      emailVerificationRequired: true,
    },
  });

  const verification = await issueEmailVerificationForUser({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return {
    email: user.email,
    requiresEmailVerification: true,
    resent: false,
    emailSent: verification.emailSent,
    verificationUrl: verification.verificationUrl,
  };
}

export async function logoutSession() {
  await destroyCurrentSession();
}

export async function requestPasswordResetWithCredentials(payload: unknown) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  try {
    const parsed = forgotPasswordSchema.parse(payload);
    return await requestPasswordReset(parsed.email);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AuthFlowError({
        code: "PASSWORD_RESET_REQUEST_INVALID",
        message: "Please enter a valid email address.",
      });
    }

    throw error;
  }
}

export async function resetPasswordWithCredentials(payload: unknown) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  try {
    const parsed = resetPasswordSchema.parse(payload);
    return await resetPasswordWithToken(parsed.token, parsed.password);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AuthFlowError({
        code: "PASSWORD_RESET_INPUT_INVALID",
        message: "Please provide a valid reset link and matching passwords.",
      });
    }

    throw error;
  }
}

export async function changePasswordWithCredentials(input: {
  userId: string;
  currentSessionToken: string | null;
  payload: unknown;
}) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  let parsed: ReturnType<typeof changePasswordSchema.parse>;

  try {
    parsed = changePasswordSchema.parse(input.payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AuthFlowError({
        code: "PASSWORD_CHANGE_INPUT_INVALID",
        message: "Please complete the form and confirm the new password.",
      });
    }

    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      statusReason: true,
    },
  });

  if (!user) {
    throw new AuthFlowError({
      code: "PASSWORD_CHANGE_USER_NOT_FOUND",
      message: "This account could not be found.",
      status: 404,
    });
  }

  const accountStateMessage = getAccountStateMessage(user.status, user.statusReason);

  if (accountStateMessage) {
    throw new AuthFlowError({
      code: "PASSWORD_CHANGE_ACCOUNT_RESTRICTED",
      message: accountStateMessage,
      status: 403,
    });
  }

  const currentPasswordMatches = await verifyPassword(parsed.currentPassword, user.passwordHash);

  if (!currentPasswordMatches) {
    throw new AuthFlowError({
      code: "PASSWORD_CHANGE_CURRENT_INCORRECT",
      message: "Your current password is incorrect.",
    });
  }

  if (parsed.currentPassword === parsed.newPassword) {
    throw new AuthFlowError({
      code: "PASSWORD_CHANGE_UNCHANGED",
      message: "Your new password must be different from the current password.",
    });
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      passwordHash: await hashPassword(parsed.newPassword),
    },
  });

  await destroyOtherSessionsForUser(input.userId, input.currentSessionToken);

  return {
    updated: true,
  };
}
