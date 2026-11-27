import useScreenState from '../../../app/useScreenState';
import Icon from './Icon';
export default function PropertyImage({ src, name }) {
  const [failed, setFailed] = useScreenState(false);
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const url = src && (/^https?:\/\//i.test(src) ? src : base.replace(/\/$/, '') + '/' + src.replace(/^\//, ''));
  if (!url || failed) return <Icon className="prop-bg-icon">apartment</Icon>;
  return <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}
