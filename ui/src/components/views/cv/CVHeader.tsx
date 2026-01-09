import { Header } from '../../shared/Header';
import { DownloadPdfButton } from './DownloadPdfButton';

export function CVHeader() {
  return <Header activePage="cv" rightActions={<DownloadPdfButton />} />;
}

