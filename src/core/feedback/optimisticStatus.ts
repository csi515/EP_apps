export async function commitOptimistic(input: {
  apply: () => void;
  rollback: () => void;
  persist: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess?: () => void;
}): Promise<boolean> {
  input.apply();
  try {
    await input.persist();
    input.onSuccess?.();
    return true;
  } catch (error) {
    input.rollback();
    input.onError(error instanceof Error ? error.message : '저장에 실패했습니다.');
    return false;
  }
}
