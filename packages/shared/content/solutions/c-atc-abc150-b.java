class Solution {
    public int countAbc(String s) {
        int c = 0;
        for (int i = 0; i + 2 < s.length(); i++) {
            if (s.charAt(i) == 'A' && s.charAt(i + 1) == 'B' && s.charAt(i + 2) == 'C') c++;
        }
        return c;
    }
}
