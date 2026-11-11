class Solution {
    public String rotN(int n, String s) {
        char[] chars = s.toCharArray();
        for (int i = 0; i < chars.length; i++) {
            chars[i] = (char)('A' + (chars[i] - 'A' + n) % 26);
        }
        return new String(chars);
    }
}
