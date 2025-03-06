"use client";

import { MainLayout } from '@/components/layout/MainLayout';
import { EncryptionForm } from '@/components/encryption/EncryptionForm';
import { Landing } from './landing';

// This explicitly configures the page for client-side only rendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // This ensures we're not trying to use Node.js APIs in this page

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
