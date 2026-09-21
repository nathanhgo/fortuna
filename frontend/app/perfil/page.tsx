import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/ProfileScreen';

export const metadata: Metadata = {
  title: 'Perfil',
  description: 'Perfil local da Fortuna: nome, foto e estatísticas guardados só neste navegador.',
  robots: { index: false, follow: false },
};

export default function PerfilPage() {
  return <ProfileScreen />;
}
