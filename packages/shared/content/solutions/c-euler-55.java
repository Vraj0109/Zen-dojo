class Solution {
    private static String addRev(String s) {
        StringBuilder out = new StringBuilder();
        int carry = 0;
        int n = s.length();
        for (int i = n - 1; i >= 0; i--) {
            int v = (s.charAt(i) - '0') + (s.charAt(n - 1 - i) - '0') + carry;
            out.append((char)('0' + v % 10));
            carry = v / 10;
        }
        if (carry > 0) out.append((char)('0' + carry));
        return out.reverse().toString();
    }

    private static boolean pal(String s) {
        for (int i = 0, j = s.length(); i + 1 < j; i++, j--) {
            if (s.charAt(i) != s.charAt(j - 1)) return false;
        }
        return true;
    }

    public int lychrelCount(int limit, int iterations) {
        int count = 0;
        for (int n = 1; n < limit; n++) {
            String s = Integer.toString(n);
            boolean found = false;
            for (int it = 0; it < iterations && !found; it++) {
                s = addRev(s);
                if (pal(s)) found = true;
            }
            if (!found) count++;
        }
        return count;
    }
}
