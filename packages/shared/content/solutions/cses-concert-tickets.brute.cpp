#include <vector>

class Solution {
public:
    std::vector<int> concertTickets(std::vector<int>& tickets, std::vector<int>& maxPrices) {
        std::vector<int> remaining = tickets;
        std::vector<int> ans;
        for (int p : maxPrices) {
            int bestIdx = -1;
            for (size_t i = 0; i < remaining.size(); i++) {
                if (remaining[i] <= p) {
                    if (bestIdx == -1 || remaining[i] > remaining[bestIdx]) {
                        bestIdx = i;
                    }
                }
            }
            if (bestIdx != -1) {
                ans.push_back(remaining[bestIdx]);
                remaining.erase(remaining.begin() + bestIdx);
            } else {
                ans.push_back(-1);
            }
        }
        return ans;
    }
};
