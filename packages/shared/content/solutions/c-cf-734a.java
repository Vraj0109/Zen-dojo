class Solution {
    public String determineChessWinner(String s) {
        int a = 0, d = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == 'A') a++;
            else d++;
        }
        if (a > d) return "Anton";
        if (d > a) return "Danik";
        return "Friendship";
    }
}
