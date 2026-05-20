import {Module} from '@nestjs/common';
import {PaymentOccurrencesController} from './payment-occurrences.controller';
import {PaymentOccurrencesService} from './payment-occurrences.service';
import {AuthModule} from '../auth/auth.module';
import {UsersModule} from '../users/users.module';

@Module({
    imports: [AuthModule, UsersModule],
    controllers: [PaymentOccurrencesController],
    providers: [PaymentOccurrencesService],
    exports: [PaymentOccurrencesService],
})
export class PaymentOccurrencesModul{}