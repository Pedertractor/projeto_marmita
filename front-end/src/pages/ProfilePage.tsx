import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/useAuth';
import { authApi } from '@/services/auth';
import { isSyntheticInternalEmail } from '@/constants/company-kind';
import { formattedRoles } from '@/utils/roles';
import { AvatarPicker } from '@/components/avatar-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(isSyntheticInternalEmail(user.email) ? '' : user.email);
  }, [user]);

  if (!user) return null;

  const currentDisplayEmail = isSyntheticInternalEmail(user.email)
    ? 'Não cadastrado'
    : user.email;
  const normalizedDraft = email.trim().toLowerCase();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedDraft);
  const currentNormalized = isSyntheticInternalEmail(user.email)
    ? ''
    : user.email.trim().toLowerCase();
  const canSave =
    emailLooksValid &&
    normalizedDraft !== currentNormalized &&
    !isSyntheticInternalEmail(normalizedDraft);

  async function handleSaveEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    try {
      const result = await authApi.updateMyEmail(normalizedDraft);
      updateUser(result.user);
      toast.success(
        result.user.needsEmailChallenge
          ? 'E-mail atualizado. Confirme o código enviado para continuar.'
          : 'E-mail atualizado com sucesso.',
      );
    } catch (error) {
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Não foi possível atualizar o e-mail.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(dataUrl: string) {
    setUploadingAvatar(true);
    try {
      const result = await authApi.updateMyAvatar(dataUrl);
      updateUser(result.user);
      toast.success('Foto atualizada com sucesso.');
    } catch (error) {
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Não foi possível atualizar a foto.';
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className='mx-auto w-full max-w-lg'>
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Seus dados de acesso</CardDescription>
        </CardHeader>
        <CardContent className='space-y-5 text-sm'>
          <AvatarPicker
            value={user.avatarUrl}
            onChange={(dataUrl) => void handleAvatarChange(dataUrl)}
            name={user.name}
            uploading={uploadingAvatar}
            label='Foto de perfil'
            compact
          />

          <div>
            <p className='text-muted-foreground'>Nome</p>
            <p className='font-medium'>{user.name}</p>
          </div>

          <form className='space-y-3' onSubmit={(e) => void handleSaveEmail(e)}>
            <div className='space-y-2'>
              <Label htmlFor='profile-email'>E-mail de login</Label>
              <Input
                id='profile-email'
                type='email'
                autoComplete='email'
                value={email}
                placeholder={
                  isSyntheticInternalEmail(user.email)
                    ? 'seu@email.com'
                    : undefined
                }
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                Atual: {currentDisplayEmail}
                {user.role === 'REQUESTER'
                  ? '. Ao alterar, enviaremos um código para o novo e-mail.'
                  : '.'}
              </p>
            </div>
            <Button type='submit' disabled={!canSave || saving}>
              {saving ? 'Salvando…' : 'Salvar e-mail'}
            </Button>
          </form>

          <div>
            <p className='text-muted-foreground'>Papel</p>
            <p className='font-medium'>{formattedRoles[user.role]}</p>
          </div>
          {user.company?.name ? (
            <div>
              <p className='text-muted-foreground'>Empresa</p>
              <p className='font-medium'>{user.company.name}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
