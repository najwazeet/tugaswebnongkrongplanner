const { z } = require("zod");

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const CreateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  deadline: z.string().optional().nullable().default(null),
  proposedDates: z.array(z.string()).optional().default([]), // ISO strings
  locationOptions: z.array(z.string()).optional().default([]), // labels
});

const JoinSchema = z.object({
  name: z.string().min(1).max(30),
});

const AddDateSchema = z.object({ iso: z.string().min(1) });
const AddLocSchema = z.object({ label: z.string().min(1) });

const VoteSchema = z.object({ optionId: z.string().min(1) });

const MessageSchema = z.object({ text: z.string().min(1).max(500) });

const BillSetSchema = z.object({
  total: z.number().nonnegative(),
  splitMode: z.enum(["EVEN", "ITEM"]).optional(),
});

const BillItemSchema = z.object({
  name: z.string().min(1),
  cost: z.number().positive(),
  assigneeMemberId: z.string().min(1),
});

const UpdateMeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  photo: z.string().url().optional(),
});

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

module.exports = {
  RegisterSchema,
  LoginSchema,
  CreateEventSchema,
  JoinSchema,
  AddDateSchema,
  AddLocSchema,
  VoteSchema,
  MessageSchema,
  BillSetSchema,
  BillItemSchema,
  UpdateMeSchema,
  ChangePasswordSchema,
};
