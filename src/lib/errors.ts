// PostgRESTはRLSでUPDATE/DELETEが拒否されてもerrorではなく0行を返すため、
// 呼び出し側で .select() の affected rows を検証してこのヘルパーで通知する。
export const silentFailAlert = (action: string) => {
  window.alert(`${action}に失敗しました。権限がない可能性があります。`);
};
