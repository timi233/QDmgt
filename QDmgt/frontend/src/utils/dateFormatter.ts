/**
 * 日期格式化工具函数
 *
 * 提供统一的日期格式化功能，确保整个应用使用一致的日期显示格式
 */

/**
 * 将日期格式化为 YYYY/MM/DD 格式
 *
 * @param dateString - ISO 8601 日期字符串或 Date 对象
 * @returns 格式化后的日期字符串 (YYYY/MM/DD)，如果输入无效则返回 '-'
 *
 * @example
 * formatDate('2025-10-14T08:30:00Z') // 返回 '2025/10/14'
 * formatDate(new Date()) // 返回当前日期的 YYYY/MM/DD 格式
 * formatDate('') // 返回 '-'
 * formatDate(null) // 返回 '-'
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) {
    return '-';
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '-';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '-';
  }
};

/**
 * 将日期时间格式化为 YYYY/MM/DD HH:mm:ss 格式
 *
 * @param dateString - ISO 8601 日期字符串或 Date 对象
 * @returns 格式化后的日期时间字符串，如果输入无效则返回 '-'
 *
 * @example
 * formatDateTime('2025-10-14T08:30:45Z') // 返回 '2025/10/14 08:30:45'
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) {
    return '-';
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '-';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('日期时间格式化错误:', error);
    return '-';
  }
};

export default { formatDate, formatDateTime };
