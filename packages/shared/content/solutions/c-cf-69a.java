class Solution {
    public boolean youngPhysicist(int[][] forces) {
        int x = 0, y = 0, z = 0;
        for (int[] f : forces) {
            x += f[0];
            y += f[1];
            z += f[2];
        }
        return x == 0 && y == 0 && z == 0;
    }
}
