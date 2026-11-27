import useScreenState from '../../../app/useScreenState';
import Icon from './Icon';

/** `src` is already resolved by mapProperty (same photo the public listing shows). */
export default function PropertyImage({ src, name }) {
  const [failed, setFailed] = useScreenState(false);
  if (!src || failed) return <Icon className="prop-bg-icon">apartment</Icon>;
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}
