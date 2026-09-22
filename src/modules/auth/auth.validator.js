const { z } = require("zod");
const AUTH = require("./auth.constants");

/*
|--------------------------------------------------------------------------
| Common Regular Expressions
|--------------------------------------------------------------------------
*/

const EMAIL_REGEX = AUTH.EMAIL.PATTERN;

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{}|;:,.<>?]).+$/;

const NAME_REGEX = /^[A-Za-zÀ-ÿ' -]+$/;

/*
|--------------------------------------------------------------------------
| Reusable Schemas
|--------------------------------------------------------------------------
*/

const emailSchema = z
  .string({
    required_error: "Email is required",
    invalid_type_error: "Email must be a string",
  })
  .trim()
  .min(1, "Email cannot be empty")
  .max(AUTH.EMAIL.MAX_LENGTH, "Email is too long")
  .regex(EMAIL_REGEX, "Invalid email address");

const passwordSchema = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password must be a string",
  })
  .min(
    AUTH.PASSWORD.MIN_LENGTH,
    `Password must be at least ${AUTH.PASSWORD.MIN_LENGTH} characters`
  )
  .max(
    AUTH.PASSWORD.MAX_LENGTH,
    `Password cannot exceed ${AUTH.PASSWORD.MAX_LENGTH} characters`
  )
  .regex(
    PASSWORD_REGEX,
    "Password must contain uppercase, lowercase, number and special character"
  );

const firstNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(NAME_REGEX, "Invalid first name");

const middleNameSchema = z
  .string()
  .trim()
  .max(50)
  .regex(NAME_REGEX, "Invalid middle name")
  .optional();

const lastNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(NAME_REGEX, "Invalid last name");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone number must use international format, for example +2348012345678")
  .optional();

const optionalPhoneSchema = z.preprocess((value) => value === "" ? undefined : value, phoneSchema);
const optionalMiddleNameSchema = z.preprocess((value) => value === "" ? undefined : value, middleNameSchema);
const optionalText = (schema) => z.preprocess((value) => value === "" ? undefined : value, schema.optional());

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

const loginSchema = z
  .object({
    email: emailSchema,

    password: z
      .string({
        required_error: "Password is required",
      })
      .min(1, "Password is required"),
  })
  .strict();

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

const registerSchema = z
  .object({
    firstName: firstNameSchema,
    middleName: optionalMiddleNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Phone number must use international format, for example +2348012345678"),
    dateOfBirth: z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional()),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    address: optionalText(z.string().trim().max(500)),
    nationality: optionalText(z.string().trim().max(80)),
    stateOfOrigin: optionalText(z.string().trim().max(80)),
    localGovernment: optionalText(z.string().trim().max(80)),
    occupation: optionalText(z.string().trim().max(120)),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["STUDENT", "TEACHER", "PARENT"]).default("STUDENT"),
    staffNumber: optionalText(z.string().trim().min(2).max(50)),
    jobTitle: optionalText(z.string().trim().max(120)),
    qualification: optionalText(z.string().trim().max(300)),
    childRegistrationNumber: optionalText(z.string().trim().min(2).max(50)),
    relationship: optionalText(z.string().trim().max(50)),
  })
  .strict()
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data) => data.role !== "PARENT" || Boolean(data.childRegistrationNumber),
    { message: "Child registration number is required for parent registration", path: ["childRegistrationNumber"] }
  )
  .refine(
    (data) => data.role !== "TEACHER" || Boolean(data.staffNumber),
    {
      message: "Staff number is required for teacher registration",
      path: ["staffNumber"],
    }
  );

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
*/

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),

    newPassword: passwordSchema,

    confirmPassword: z.string(),
  })
  .strict()
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: "New password cannot be the same as the current password",
      path: ["newPassword"],
    }
  );

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
*/

const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),

    password: passwordSchema,

    confirmPassword: z.string(),
  })
  .strict()
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

/*
|--------------------------------------------------------------------------
| REFRESH TOKEN
|--------------------------------------------------------------------------
*/

const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

/*
|--------------------------------------------------------------------------
| VERIFY EMAIL
|--------------------------------------------------------------------------
*/

const verifyEmailSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();

/*
|--------------------------------------------------------------------------
| RESEND VERIFICATION EMAIL
|--------------------------------------------------------------------------
*/

const resendVerificationSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,

  emailSchema,
  passwordSchema,
  phoneSchema,
  firstNameSchema,
  middleNameSchema,
  lastNameSchema,
};