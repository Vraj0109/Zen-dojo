#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
        int n = profits.size();
        vector<bool> used(n, false);
        long long money = w;
        for (int step = 0; step < k; step++) {
            int bestIdx = -1;
            int bestProfit = -1;
            for (int i = 0; i < n; i++) {
                if (!used[i] && capital[i] <= money) {
                    if (profits[i] > bestProfit) {
                        bestProfit = profits[i];
                        bestIdx = i;
                    }
                }
            }
            if (bestIdx == -1) break;
            used[bestIdx] = true;
            money += bestProfit;
        }
        return (int)money;
    }
};
