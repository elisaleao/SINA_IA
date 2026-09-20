import { Metadata } from 'next';
import AccessibleDocumentProcessor from '@/components/AccessibleDocumentProcessor';

export const metadata: Metadata = {
  title: 'Processador de Documentos Acessíveis | SINA_IA',
  description:
    'Adaptação de documentos para acessibilidade por áudio, descrição de gráficos e transcrição de fórmulas matemáticas.',
};

export default function ProcessarDocumentoPage() {
  return (
    <main
      className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full"
      role="region"
      aria-label="Processador de Documentos Acessíveis"
    >
      <AccessibleDocumentProcessor />
    </main>
  );
}

