import { MainLayout } from '@/components/layout/MainLayout';
import { EncryptionForm } from '@/components/encryption/EncryptionForm';
import { Landing } from './landing';

export default function HomePage() {
  return (
    <MainLayout>
      <Landing />
      <div className="mt-16">
        <EncryptionForm />
      </div>
    </MainLayout>
  );
}
