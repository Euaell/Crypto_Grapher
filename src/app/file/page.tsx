"use client";

import { MainLayout } from '@/components/layout/MainLayout';
import { FileEncryptionForm } from '@/components/file/FileEncryptionForm';

// This explicitly configures the page for client-side only rendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // This ensures we're not trying to use Node.js APIs in this page

export default function FilePage() {
  return (
    <MainLayout>
      <FileEncryptionForm />
    </MainLayout>
  );
} 