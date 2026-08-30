import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Subscription } from './subscription.entity';
import { SubscriptionPayment } from './subscription-payment.entity';
import { User } from '../users/user.entity';
import { CheckoutDto, VerifyPaymentDto, RenewSubscriptionDto, UpgradeSubscriptionDto } from './subscriptions.dto';

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private plansRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPayment)
    private paymentsRepository: Repository<SubscriptionPayment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
    await this.syncExistingOwnerSubscriptions();
  }

  // Auto-seed the 3 required plans if not present
  private async seedDefaultPlans() {
    const count = await this.plansRepository.count();
    if (count === 0) {
      const defaultPlans = [
        {
          name: 'MONTHLY',
          displayName: 'Monthly',
          description: 'Essential PG listing & management for 1 month',
          price: 499,
          durationMonths: 1,
          currency: 'INR',
          features: [
            'List & Manage PG Properties',
            'Tenant Management Tools',
            'Basic Analytics Dashboard',
            'Standard Email Support'
          ],
          badge: undefined,
          isActive: true,
          sortOrder: 1
        },
        {
          name: 'YEARLY',
          displayName: 'Yearly',
          description: 'Best value for growing PG owners with premium benefits',
          price: 4999,
          durationMonths: 12,
          currency: 'INR',
          features: [
            'List & Manage PG Properties',
            'Tenant Management & Room Allocation',
            'Advanced Analytics & Revenue Insights',
            'Priority Support 24/7',
            'Featured PG Listing Badge'
          ],
          badge: 'Most Popular',
          isActive: true,
          sortOrder: 2
        },
        {
          name: 'LIFETIME',
          displayName: 'Lifetime',
          description: 'One-time payment for lifetime access with no renewals',
          price: 14999,
          durationMonths: null,
          currency: 'INR',
          features: [
            'List Unlimited PG Properties',
            'All Advanced Analytics & Custom Reports',
            'VIP Dedicated Account Manager',
            'Top Priority Search Placement',
            'Lifetime Free Feature Updates',
            'Zero Renewal Fees Forever'
          ],
          badge: 'Best Value',
          isActive: true,
          sortOrder: 3
        }
      ];

      for (const p of defaultPlans) {
        const plan = this.plansRepository.create({
          ...p,
          durationMonths: p.durationMonths ?? undefined
        });
        await this.plansRepository.save(plan);
      }
      console.log('[SubscriptionsService] Default subscription plans seeded successfully.');
    }
  }

  // Ensure seeded owners in demo data have proper subscription records
  private async syncExistingOwnerSubscriptions() {
    try {
      const owners = await this.usersRepository.find({ where: { role: 'owner' } });
      const monthlyPlan = await this.plansRepository.findOne({ where: { name: 'MONTHLY' } });
      const yearlyPlan = await this.plansRepository.findOne({ where: { name: 'YEARLY' } });
      const today = new Date().toISOString().split('T')[0];

      for (const owner of owners) {
        const existingSub = await this.subscriptionsRepository.findOne({ where: { ownerId: owner.id } });
        if (!existingSub) {
          if (owner.username === 'owner3' || owner.subscriptionPlan === 'Expired') {
            // Seed as Expired
            const expiredStartDate = '2025-01-01';
            const expiredEndDate = '2025-02-01';
            const sub = this.subscriptionsRepository.create({
              ownerId: owner.id,
              planId: monthlyPlan ? monthlyPlan.id : 1,
              planType: 'MONTHLY',
              amount: 499,
              currency: 'INR',
              startDate: expiredStartDate,
              endDate: expiredEndDate,
              status: 'EXPIRED',
              orderId: `seed_ord_${owner.id}`,
              receiptNumber: `RB-2025-00000${owner.id}`
            });
            const savedSub = await this.subscriptionsRepository.save(sub);

            const payment = this.paymentsRepository.create({
              ownerId: owner.id,
              subscriptionId: savedSub.id,
              planType: 'MONTHLY',
              transactionId: `TX_SEED_${owner.id}`,
              orderId: `seed_ord_${owner.id}`,
              amount: 499,
              currency: 'INR',
              paymentMethod: 'MockGateway',
              status: 'SUCCESS',
              paymentDate: expiredStartDate,
              receiptNumber: `RB-2025-00000${owner.id}`,
              planDuration: '1 Month'
            });
            await this.paymentsRepository.save(payment);
          } else if (owner.username === 'owner1' || owner.username === 'owner2' || owner.subscriptionPlan) {
            // Seed as Active
            const plan = owner.username === 'owner2' ? yearlyPlan : monthlyPlan;
            const planType = plan ? plan.name : 'MONTHLY';
            const amount = plan ? plan.price : 499;
            const duration = plan && plan.durationMonths ? plan.durationMonths : 1;
            
            const expDate = new Date();
            expDate.setMonth(expDate.getMonth() + duration);
            const endDate = expDate.toISOString().split('T')[0];

            const sub = this.subscriptionsRepository.create({
              ownerId: owner.id,
              planId: plan ? plan.id : 1,
              planType,
              amount,
              currency: 'INR',
              startDate: today,
              endDate,
              status: 'ACTIVE',
              orderId: `seed_ord_${owner.id}`,
              receiptNumber: `RB-2026-00000${owner.id}`
            });
            const savedSub = await this.subscriptionsRepository.save(sub);

            const payment = this.paymentsRepository.create({
              ownerId: owner.id,
              subscriptionId: savedSub.id,
              planType,
              transactionId: `TX_SEED_${owner.id}`,
              orderId: `seed_ord_${owner.id}`,
              amount,
              currency: 'INR',
              paymentMethod: 'MockGateway',
              status: 'SUCCESS',
              paymentDate: today,
              receiptNumber: `RB-2026-00000${owner.id}`,
              planDuration: duration === 12 ? '1 Year' : '1 Month'
            });
            await this.paymentsRepository.save(payment);

            // Update user entity
            owner.subscriptionPlan = plan ? plan.displayName : 'Monthly';
            owner.subscriptionFee = amount;
            await this.usersRepository.save(owner);
          }
        }
      }
    } catch (e) {
      console.error('[SubscriptionsService] Error syncing existing owner subscriptions:', e);
    }
  }

  // Generate formatted receipt number
  private generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `RB-${year}-${rand}`;
  }

  // Get all active plans
  async getPlans() {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' }
    });
  }

  // Helper to check and evaluate subscription expiry
  private evaluateSubscriptionStatus(sub: Subscription): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' {
    if (sub.status === 'CANCELLED' || sub.status === 'PENDING') {
      return sub.status as any;
    }
    if (!sub.endDate) {
      // Lifetime never expires
      return 'ACTIVE';
    }
    const today = new Date().toISOString().split('T')[0];
    if (sub.endDate < today) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  // Get current subscription for an owner
  async getCurrentSubscription(ownerId: number) {
    const owner = await this.usersRepository.findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Owner not found');

    const subs = await this.subscriptionsRepository.find({
      where: { ownerId },
      relations: { plan: true },
      order: { createdAt: 'DESC' }
    });

    const current = subs.length > 0 ? subs[0] : null;

    if (!current) {
      return {
        hasSubscription: false,
        isActive: false,
        status: 'NONE',
        subscription: null,
        plan: null,
        canUpgrade: false,
        upgradePlans: await this.getPlans()
      };
    }

    const currentStatus = this.evaluateSubscriptionStatus(current);
    if (current.status !== currentStatus && current.status === 'ACTIVE' && currentStatus === 'EXPIRED') {
      current.status = 'EXPIRED';
      await this.subscriptionsRepository.save(current);
    }

    // Determine available upgrade plans
    const allPlans = await this.getPlans();
    let upgradePlans: SubscriptionPlan[] = [];
    let canUpgrade = false;

    if (currentStatus === 'ACTIVE') {
      if (current.planType === 'MONTHLY') {
        upgradePlans = allPlans.filter(p => p.name === 'YEARLY' || p.name === 'LIFETIME');
        canUpgrade = true;
      } else if (current.planType === 'YEARLY') {
        upgradePlans = allPlans.filter(p => p.name === 'LIFETIME');
        canUpgrade = true;
      } else {
        // LIFETIME — no upgrades
        upgradePlans = [];
        canUpgrade = false;
      }
    } else {
      // If expired, all plans are available for renewal
      upgradePlans = allPlans;
      canUpgrade = false;
    }

    return {
      hasSubscription: true,
      isActive: currentStatus === 'ACTIVE',
      status: currentStatus,
      subscription: current,
      plan: current.plan,
      canUpgrade,
      upgradePlans
    };
  }

  // Check if owner has an active subscription (used by guards)
  async checkSubscriptionActive(ownerId: number): Promise<boolean> {
    const current = await this.getCurrentSubscription(ownerId);
    return current.isActive;
  }

  // Initiate checkout order
  async checkout(ownerId: number, dto: CheckoutDto) {
    const owner = await this.usersRepository.findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Owner not found');

    const plan = await this.plansRepository.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) throw new NotFoundException('Selected subscription plan not found');

    // Check if owner already has active Lifetime plan
    const current = await this.getCurrentSubscription(ownerId);
    if (current.isActive && current.subscription?.planType === 'LIFETIME') {
      throw new BadRequestException('You already have an active Lifetime subscription. No additional subscription required.');
    }

    const orderId = `order_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      orderId,
      amount: plan.price,
      currency: plan.currency,
      plan: {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        durationMonths: plan.durationMonths,
        features: plan.features
      },
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone
      },
      paymentMethod: dto.paymentMethod || 'MockGateway',
      keyId: 'mock_key_live_rentbro'
    };
  }

  // Verify payment & activate subscription
  async verifyPayment(ownerId: number, planId: number, dto: VerifyPaymentDto, paymentMethod: string = 'MockGateway') {
    const owner = await this.usersRepository.findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Owner not found');

    const plan = await this.plansRepository.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    if (dto.simulateFailure) {
      // Record failed payment
      const failedPayment = this.paymentsRepository.create({
        ownerId,
        planType: plan.name,
        transactionId: dto.transactionId || `TX_FAIL_${Date.now()}`,
        orderId: dto.orderId,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod,
        status: 'FAILED',
        paymentDate: new Date().toISOString().split('T')[0],
        receiptNumber: `RB-FAIL-${Date.now()}`,
        planDuration: plan.durationMonths ? `${plan.durationMonths} Months` : 'Lifetime'
      });
      await this.paymentsRepository.save(failedPayment);
      throw new BadRequestException('Payment failed or was cancelled. Subscription not activated.');
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    let endDate: string | null = null;

    if (plan.durationMonths) {
      const expDate = new Date(today);
      expDate.setMonth(expDate.getMonth() + plan.durationMonths);
      endDate = expDate.toISOString().split('T')[0];
    }

    const receiptNumber = this.generateReceiptNumber();

    // 1. Deactivate previous active subscriptions for this owner
    const previousActive = await this.subscriptionsRepository.find({
      where: { ownerId, status: 'ACTIVE' }
    });
    for (const sub of previousActive) {
      sub.status = 'CANCELLED';
      await this.subscriptionsRepository.save(sub);
    }

    // 2. Create and activate new subscription
    const newSub = this.subscriptionsRepository.create({
      ownerId,
      planId: plan.id,
      planType: plan.name,
      amount: plan.price,
      currency: plan.currency,
      startDate,
      endDate,
      status: 'ACTIVE',
      orderId: dto.orderId,
      receiptNumber
    });
    const savedSub = await this.subscriptionsRepository.save(newSub);

    // 3. Create payment record
    const payment = this.paymentsRepository.create({
      ownerId,
      subscriptionId: savedSub.id,
      planType: plan.name,
      transactionId: dto.transactionId || `TX_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: dto.orderId,
      amount: plan.price,
      currency: plan.currency,
      paymentMethod,
      status: 'SUCCESS',
      paymentDate: startDate,
      receiptNumber,
      planDuration: plan.durationMonths ? (plan.durationMonths === 12 ? '1 Year' : `${plan.durationMonths} Month(s)`) : 'Lifetime'
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    savedSub.paymentId = savedPayment.id;
    await this.subscriptionsRepository.save(savedSub);

    // 4. Update user entity's quick subscription fields
    owner.subscriptionPlan = plan.displayName;
    owner.subscriptionFee = plan.price;
    await this.usersRepository.save(owner);

    return {
      success: true,
      message: 'Subscription successfully activated!',
      subscription: {
        ...savedSub,
        plan
      },
      payment: savedPayment,
      receipt: {
        receiptNumber,
        transactionId: savedPayment.transactionId,
        orderId: savedPayment.orderId,
        planName: plan.displayName,
        planType: plan.name,
        amount: plan.price,
        currency: plan.currency,
        paymentDate: startDate,
        startDate,
        endDate: endDate || 'Lifetime',
        status: 'Paid',
        ownerName: owner.name,
        ownerEmail: owner.email,
        paymentMethod
      }
    };
  }

  // Upgrade subscription flow
  async upgrade(ownerId: number, dto: UpgradeSubscriptionDto) {
    const current = await this.getCurrentSubscription(ownerId);
    if (!current.isActive) {
      throw new BadRequestException('No active subscription found to upgrade. Please purchase a new plan instead.');
    }

    if (current.subscription?.planType === 'LIFETIME') {
      throw new BadRequestException('You are already on the Lifetime plan. No upgrade available.');
    }

    const newPlan = await this.plansRepository.findOne({ where: { id: dto.newPlanId, isActive: true } });
    if (!newPlan) throw new NotFoundException('Upgrade target plan not found');

    if (current.subscription?.planType === 'YEARLY' && newPlan.name === 'MONTHLY') {
      throw new BadRequestException('Cannot downgrade from Yearly to Monthly plan.');
    }

    if (current.subscription?.planType === newPlan.name) {
      throw new BadRequestException('You are already subscribed to this plan.');
    }

    const orderId = `order_upg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      orderId,
      amount: newPlan.price,
      currency: newPlan.currency,
      isUpgrade: true,
      fromPlan: current.subscription?.planType,
      toPlan: newPlan.name,
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        displayName: newPlan.displayName,
        price: newPlan.price,
        durationMonths: newPlan.durationMonths
      }
    };
  }

  // Renew subscription flow
  async renew(ownerId: number, dto: RenewSubscriptionDto) {
    const current = await this.getCurrentSubscription(ownerId);
    const planId = dto.planId || current.subscription?.planId;
    if (!planId) {
      throw new BadRequestException('Please specify a plan to subscribe.');
    }

    const plan = await this.plansRepository.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    const orderId = `order_rnw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      orderId,
      amount: plan.price,
      currency: plan.currency,
      isRenewal: true,
      plan: {
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        durationMonths: plan.durationMonths
      }
    };
  }

  // Get all past subscriptions for an owner
  async getSubscriptionHistory(ownerId: number) {
    return this.subscriptionsRepository.find({
      where: { ownerId },
      relations: { plan: true },
      order: { createdAt: 'DESC' }
    });
  }

  // Get all payment transactions for an owner
  async getPaymentHistory(ownerId: number) {
    return this.paymentsRepository.find({
      where: { ownerId },
      relations: { subscription: { plan: true } },
      order: { createdAt: 'DESC' }
    });
  }

  // Get specific payment receipt details
  async getReceipt(paymentId: number, requestingUserId?: number, requestingRole?: string) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { owner: true, subscription: { plan: true } }
    });

    if (!payment) throw new NotFoundException(`Receipt for Payment ID ${paymentId} not found`);

    if (requestingUserId && requestingRole === 'owner' && payment.ownerId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to view this receipt');
    }

    return {
      receiptNumber: payment.receiptNumber,
      transactionId: payment.transactionId,
      orderId: payment.orderId,
      ownerName: payment.owner?.name || 'Owner',
      ownerEmail: payment.owner?.email || 'N/A',
      ownerPhone: payment.owner?.phone || 'N/A',
      planName: payment.subscription?.plan?.displayName || payment.planType,
      planType: payment.planType,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      startDate: payment.subscription?.startDate || payment.paymentDate,
      endDate: payment.subscription?.endDate || (payment.planType === 'LIFETIME' ? 'Lifetime' : 'N/A'),
      status: payment.status === 'SUCCESS' ? 'Paid' : payment.status,
      createdAt: payment.createdAt
    };
  }

  // ================= ADMIN & SUPER ADMIN APIS =================

  // Get aggregated stats for dashboard
  async getAdminStats() {
    const allSubs = await this.subscriptionsRepository.find({ relations: { plan: true, owner: true } });
    const allPayments = await this.paymentsRepository.find({ relations: { owner: true }, order: { createdAt: 'DESC' } });

    // Update statuses for stats calculation
    let activeCount = 0;
    let monthlyCount = 0;
    let yearlyCount = 0;
    let lifetimeCount = 0;
    let expiredCount = 0;
    let cancelledCount = 0;

    allSubs.forEach(sub => {
      const status = this.evaluateSubscriptionStatus(sub);
      if (status === 'ACTIVE') {
        activeCount++;
        if (sub.planType === 'MONTHLY') monthlyCount++;
        else if (sub.planType === 'YEARLY') yearlyCount++;
        else if (sub.planType === 'LIFETIME') lifetimeCount++;
      } else if (status === 'EXPIRED') {
        expiredCount++;
      } else if (status === 'CANCELLED') {
        cancelledCount++;
      }
    });

    let totalRevenue = 0;
    let successfulPayments = 0;
    let failedPayments = 0;

    allPayments.forEach(p => {
      if (p.status === 'SUCCESS') {
        totalRevenue += Number(p.amount);
        successfulPayments++;
      } else if (p.status === 'FAILED') {
        failedPayments++;
      }
    });

    return {
      subscriptions: {
        totalActive: activeCount,
        monthly: monthlyCount,
        yearly: yearlyCount,
        lifetime: lifetimeCount,
        expired: expiredCount,
        cancelled: cancelledCount,
        totalAllTime: allSubs.length
      },
      payments: {
        totalRevenue,
        successfulPayments,
        failedPayments,
        totalTransactions: allPayments.length
      },
      recentTransactions: allPayments.slice(0, 10)
    };
  }

  // Get all subscriptions list for admin
  async getAllAdminSubscriptions() {
    const subs = await this.subscriptionsRepository.find({
      relations: { owner: true, plan: true },
      order: { createdAt: 'DESC' }
    });

    return subs.map(s => ({
      ...s,
      evaluatedStatus: this.evaluateSubscriptionStatus(s)
    }));
  }

  // Get all payments list for admin
  async getAllAdminPayments() {
    return this.paymentsRepository.find({
      relations: { owner: true, subscription: { plan: true } },
      order: { createdAt: 'DESC' }
    });
  }
}
