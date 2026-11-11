class Solution {
    public boolean checkTranslation(String s, String t) {
        return new StringBuilder(s).reverse().toString().equals(t);
    }
}
