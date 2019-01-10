import * as util from 'util';

export function inspect(obj: any, depth: number = 13): string {
  return `${util.inspect(obj, true, depth, false)}`;
}
