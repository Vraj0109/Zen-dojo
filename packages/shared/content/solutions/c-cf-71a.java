class Solution {
    public String abbreviate(String word) {
        if (word.length() <= 10) return word;
        return "" + word.charAt(0) + (word.length() - 2) + word.charAt(word.length() - 1);
    }
}
