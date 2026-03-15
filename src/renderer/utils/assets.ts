export function appAsset(path: string): string {
  if (!path.startsWith('/')) {
    return path;
  }

  if (window.location.protocol !== 'file:') {
    return path;
  }

  return new URL(`.${path}`, window.location.href).toString();
}
