import { z } from 'zod';

export const loginEmailSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const loginCardSchema = z.object({
  cardNumber: z.string().min(1, 'Informe o cartão'),
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type LoginEmailFormData = z.infer<typeof loginEmailSchema>;
export type LoginCardFormData = z.infer<typeof loginCardSchema>;

export const changePasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;

export const forgotPasswordEmailSchema = z.object({
  email: z.email('E-mail inválido'),
});

export const resetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
