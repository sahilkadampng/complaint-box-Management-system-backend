export const generateComplaintId = (): string => {
    return Math.random().toString(16).slice(2, 14);  // 12 character hex string
};