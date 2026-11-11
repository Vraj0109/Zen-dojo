class Solution {
    public String evaluateDifficulty(int[] opinions) {
        for (int op : opinions) {
            if (op == 1) return "HARD";
        }
        return "EASY";
    }
}
