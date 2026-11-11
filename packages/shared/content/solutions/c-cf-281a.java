class Solution {
    public String capitalizeWord(String s) {
        if (!s.isEmpty()) {
            return Character.toUpperCase(s.charAt(0)) + s.substring(1);
        }
        return s;
    }
}
