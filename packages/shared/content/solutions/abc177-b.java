class Solution {
    public int minToContain(String s, String t) {
        int best = t.length();
        for (int i = 0; i + t.length() <= s.length(); i++) {
            int c = 0;
            for (int j = 0; j < t.length(); j++) {
                if (s.charAt(i + j) != t.charAt(j)) c++;
            }
            best = Math.min(best, c);
        }
        return best;
    }
}
