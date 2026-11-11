class Solution {
    public int findBallPosition(String moves) {
        int pos = 1;
        for (int i = 0; i < moves.length(); i++) {
            char m = moves.charAt(i);
            if (m == 'A') {
                if (pos == 1) pos = 2;
                else if (pos == 2) pos = 1;
            } else if (m == 'B') {
                if (pos == 2) pos = 3;
                else if (pos == 3) pos = 2;
            } else if (m == 'C') {
                if (pos == 1) pos = 3;
                else if (pos == 3) pos = 1;
            }
        }
        return pos;
    }
}
