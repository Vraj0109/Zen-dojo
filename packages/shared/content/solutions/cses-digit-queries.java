class Solution {
    public int digitQueries(String k) {
        long kv = Long.parseLong(k);
        long len = 1, count = 9, start = 1;
        while (kv > len * count) {
            kv -= len * count;
            len++;
            count *= 10;
            start *= 10;
        }
        long num = start + (kv - 1) / len;
        String s = String.valueOf(num);
        return s.charAt((int) ((kv - 1) % len)) - '0';
    }
}
