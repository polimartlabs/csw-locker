
;; title: bitcoin-locker-trait
;; version:
;; summary:
;; description:

(define-trait bitcoin-locker-trait
    (
        (set-security-level (uint) (response bool uint))
        (is-inactive () (response bool uint))
    )
)