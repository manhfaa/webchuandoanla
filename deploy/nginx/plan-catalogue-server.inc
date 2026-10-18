# Include in the api.agromind.farm server block. This returns 429 before
# Django is reached. Leave room for shared Vercel egress IPs on cache misses.
limit_req zone=agromind_plan_reads burst=30 nodelay;
limit_req_status 429;
