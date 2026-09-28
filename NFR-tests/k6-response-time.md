# k6 Response Time Output results

```zsh
➜  NFR-tests git:(NFR) ✗ k6 run response-time.js

         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: response-time.js
        output: -

     scenarios: (100.00%) 1 scenario, 1 max VUs, 1m0s max duration (incl. graceful stop):
              * default: 1 looping VUs for 30s (gracefulStop: 30s)



  █ THRESHOLDS 

    http_req_duration
    ✓ 'p(95)<500' p(95)=436.13ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%


  █ TOTAL RESULTS 

    checks_total.......: 23      0.73881/s
    checks_succeeded...: 100.00% 23 out of 23
    checks_failed......: 0.00%   0 out of 23

    ✓ status is 200

    HTTP
    http_req_duration..............: avg=352.37ms min=326.33ms med=331.9ms max=441.72ms p(90)=434.38ms p(95)=436.13ms
      { expected_response:true }...: avg=352.37ms min=326.33ms med=331.9ms max=441.72ms p(90)=434.38ms p(95)=436.13ms
    http_req_failed................: 0.00% 0 out of 23
    http_reqs......................: 23    0.73881/s

    EXECUTION
    iteration_duration.............: avg=1.35s    min=1.32s    med=1.33s   max=1.44s    p(90)=1.43s    p(95)=1.43s   
    iterations.....................: 23    0.73881/s
    vus............................: 1     min=1       max=1
    vus_max........................: 1     min=1       max=1

    NETWORK
    data_received..................: 29 kB 932 B/s
    data_sent......................: 21 kB 670 B/s




running (0m31.1s), 0/1 VUs, 23 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  30s

```
