export const validatePhone = (phone: string) => /^[0-9]{10,15}$/.test(phone);
export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validateLength = (str: string, min: number, max: number) => str.length >= min && str.length <= max;
