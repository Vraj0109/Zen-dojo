class Solution {
    public String normalizeWord(String s) {
        int up = 0, low = 0;
        for (int i = 0; i < s.length(); i++) {
            if (Character.isUpperCase(s.charAt(i))) up++;
            else low++;
        }
        return up > low ? s.toUpperCase() : s.toLowerCase();
    }
}
