import { customAlphabet } from 'nanoid';

// 헷갈리는 문자(0/O, 1/I) 제외한 6자리 대문자+숫자 코드
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generateInviteCode = customAlphabet(alphabet, 6);
