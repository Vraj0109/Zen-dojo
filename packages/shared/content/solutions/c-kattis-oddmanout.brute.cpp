#include <vector>

class Solution {
public:
    int oddManOut(std::vector<int>& codes) {
        int n = codes.size();
        for (int i = 0; i < n; i++) {
            int count = 0;
            for (int j = 0; j < n; j++) {
                if (codes[i] == codes[j]) {
                    count++;
                }
            }
            if (count == 1) {
                return codes[i];
            }
        }
        return -1;
    }
};
