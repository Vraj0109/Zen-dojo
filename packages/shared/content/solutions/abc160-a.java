class Solution {
    public String isCoffeeLike(String s) {
        return (s.charAt(2) == s.charAt(3) && s.charAt(4) == s.charAt(5)) ? "Yes" : "No";
    }
}
