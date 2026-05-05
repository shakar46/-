import { format, isDate } from "date-fns";
import { ru } from "date-fns/locale";

export const convertToDate = (val: any): Date | null => {
  if (!val) return null;
  if (isDate(val)) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
};

export const safeFormat = (val: any, formatStr: string, options: any = { locale: ru }): string => {
  const date = convertToDate(val);
  if (!date) return "—";
  try {
    return format(date, formatStr, options);
  } catch (e) {
    console.error("Date formatting error:", e, val);
    return "—";
  }
};
