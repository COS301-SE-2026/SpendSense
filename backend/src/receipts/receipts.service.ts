import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceiptsService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async validateReceiptUpload(userId: string, file: Express.Multer.File | undefined, preselectedOccurrenceId?: string) {

        if (!file) {
            throw new BadRequestException('Receipt image is required.');
        }

        let metadata: sharp.Metadata;
        try {
            metadata = await sharp(file.buffer).metadata();
        } catch {
            throw new BadRequestException('Uploaded file is not a valid image.');
        }

        if (metadata.format !== 'jpeg' && metadata.format !== 'png') {
            throw new BadRequestException('Receipt must be a JPEG or PNG image.');
        }
        if (!metadata.width || !metadata.height) {
            throw new BadRequestException('Could not determine receipt image dimensions.');
        }

        const decodedPixels = metadata.width * metadata.height;
        const MAX_PIXELS = 12_000_000;

        if (decodedPixels > MAX_PIXELS) {
            throw new BadRequestException('Receipt image exceeds the 12 million pixel limit.');
        }

        if (preselectedOccurrenceId) {

            const occurrence = await this.prisma.paymentOccurrence.findFirst(
                {
                    where: {
                        id: preselectedOccurrenceId,
                        userId,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                    },
                }
            );

            if (!occurrence) {
                throw new NotFoundException('Preselected payment occurrence not found.');
            }
        }

        // this is a temporary response until OCR integration
        return {
            validated: true,

            image: {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                sizeBytes: file.size,
            },

            preselectedOccurrenceId: preselectedOccurrenceId ?? null,
        };
    }
}