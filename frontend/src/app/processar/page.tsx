import { Metadata } from 'next';

import { MaterialsScreen } from '@/components/materials/MaterialsScreen';
import { RequireRole } from '@/components/session/RequireRole';

export const metadata: Metadata = {
  title: 'Meus materiais',
  description:
    'Envie arquivos de estudo e receba texto acessível, descrição de gráficos e áudio, salvos para ouvir de novo.',
};

export default function ProcessarDocumentoPage() {
  return (
    <RequireRole allow={['aluno', 'professor', 'admin']}>
      <MaterialsScreen />
    </RequireRole>
  );
}
