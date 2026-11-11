class Solution {
    public int minChanges(String s, String t) {
        int c = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) != t.charAt(i)) c++;
        }
        return c;
    }
}
