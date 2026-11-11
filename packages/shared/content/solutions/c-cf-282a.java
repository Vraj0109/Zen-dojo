class Solution {
    public int executeBitProgram(String[] statements) {
        int x = 0;
        for (String s : statements) {
            if (s.indexOf('+') != -1) x++;
            else x--;
        }
        return x;
    }
}
