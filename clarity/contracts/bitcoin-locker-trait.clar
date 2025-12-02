
;; title: bitcoin-locker-trait
;; version:
;; summary:
;; description:

(use-trait extension-trait .extension-trait.extension-trait)

(define-trait bitcoin-locker-trait
    (
        (extension-call (<extension-trait> (buff 2048)) (response bool uint))        
    )
)