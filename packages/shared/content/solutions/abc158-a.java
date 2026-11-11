class Solution {
    public String hasBus(String s) {
        boolean a = s.indexOf('A') != -1;
        boolean b = s.indexOf('B') != -1;
        return (a && b) ? "Yes" : "No";
    }
}
