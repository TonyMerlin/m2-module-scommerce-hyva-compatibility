<?php

declare(strict_types=1);

namespace Merlin\ScommerceHyvaCompatibility\Controller\Tracking;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\Json;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Framework\Session\SessionManagerInterface;

class Wishlist implements HttpGetActionInterface
{
    public function __construct(
        private readonly SessionManagerInterface $coreSession,
        private readonly JsonFactory $jsonFactory
    ) {
    }

    public function execute(): Json
    {
        $result = $this->jsonFactory->create();
        $rawData = $this->coreSession->getProductToWishlist();

        if (!$rawData) {
            return $result->setData([]);
        }

        $this->coreSession->unsProductToWishlist();
        $data = json_decode((string) $rawData, true);

        return $result->setData(is_array($data) ? $data : []);
    }
}
