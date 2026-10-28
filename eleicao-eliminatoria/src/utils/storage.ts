// O localStorage pode estar bloqueado (janela anônima, pré-visualizações), então todo acesso é protegido.

export function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Salvar é opcional: o app continua funcionando sem isso.
  }
}

export function readFromStorage<Value>(key: string): Value | null {
  try {
    const storedValue = localStorage.getItem(key);

    return storedValue ? (JSON.parse(storedValue) as Value) : null;
  } catch {
    return null;
  }
}
