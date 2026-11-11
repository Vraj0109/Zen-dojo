class Solution {
    public int countingDigit(long k) {
        long len = 1, count = 9, first = 1;
        while (k > len * count) {
            k -= len * count;
            len++;
            count *= 10;
            first *= 10;
        }
        long num = first + (k - 1) / len;
        String s = Long.toString(num);
        return s.charAt((int)((k - 1) % len)) - '0';
    }
}
